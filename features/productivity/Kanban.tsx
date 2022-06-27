import {kanbanCols} from "pages/productivity";
import {FC} from "react";
import {DragDropContext, Droppable, Draggable, DropResult} from "react-beautiful-dnd";
import {SetFunction} from "types";

const Kanban: FC<{cols: kanbanCols; setCols: SetFunction}> = ({cols, setCols}) => (
  <div className="flex justify-center h-full">
    <DragDropContext onDragEnd={(result) => onDragEnd(result, cols, setCols)}>
      {Object.entries(cols).map(([id, col]) => (
        <div key={id}>
          <h2 className="pb-4 mb-4">{col.name}</h2>
          <Droppable key={id} droppableId={id}>
            {(provided, snapshot) => (
              <div
                className="rounded-xl border border-foreground-alt-300 bg-background-light p-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {col.items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        className="rounded-xl"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          padding: 16,
                          margin: "0 0 8px 0",
                          minHeight: "50px",
                          backgroundColor: snapshot.isDragging
                            ? "rgb(var(--color-foreground-alt-300))"
                            : "rgb(var(--color-foreground-alt-400))",
                          color: "rgb(var(--color-foreground-alt-100))",
                          ...provided.draggableProps.style,
                        }}
                      >
                        {item.content}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      ))}
    </DragDropContext>
  </div>
);

const onDragEnd = (result: DropResult, cols: kanbanCols, setCols: SetFunction) => {
  if (!result.destination) return;
  const {source, destination} = result;
  const col = cols[source.droppableId];
  const copiedItems = [...col.items];
  const [removed] = copiedItems.splice(source.index, 1);
  copiedItems.splice(destination.index, 0, removed);
  setCols({
    ...cols,
    [source.droppableId]: {
      ...col,
      items: copiedItems,
    },
  });
};

export default Kanban;
